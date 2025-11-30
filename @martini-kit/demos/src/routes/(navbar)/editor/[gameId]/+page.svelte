<script lang="ts">
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import MartiniIDE from "@martini-kit/ide";
    import {
        getIDEConfig,
        getGameMetadata,
        gameMetadata,
    } from "$lib/games/ide-configs-map";
    import type { MartiniKitIDEConfig } from "@martini-kit/ide";

    const gameId = $derived($page.params.gameId || "");
    const originalConfig = $derived(getIDEConfig(gameId));
    const metadata = $derived(getGameMetadata(gameId));

    let config = $state<MartiniKitIDEConfig | null>(null);
    let LZ: any = null;

    onMount(async () => {
        // Load LZ library for compression
        if (typeof window !== "undefined" && !(window as any).LZ) {
            const script = document.createElement("script");
            script.src =
                "https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js";
            script.onload = () => {
                LZ = (window as any).LZ;
                loadGameWithState();
            };
            document.head.appendChild(script);
        } else {
            LZ = (window as any).LZ;
            loadGameWithState();
        }
    });

    function loadGameWithState() {
        if (originalConfig) {
            config = structuredClone(originalConfig);

            // Check if URL has encoded state
            const params = new URLSearchParams(window.location.search);
            const encodedState = params.get("code");

            if (encodedState && LZ) {
                try {
                    const decoded = decodeURIComponent(encodedState);
                    const decompressed = LZ.decompress(decoded);
                    const state = JSON.parse(decompressed);

                    // Merge with original config
                    if (config) {
                        config.files = { ...config.files, ...state.files };
                    }
                } catch (e) {
                    console.warn("Failed to decode shared code:", e);
                }
            }
        }
    }

    function downloadCode() {
        if (!config) return;

        const JSZip = (window as any).JSZip;
        if (!JSZip) {
            alert(
                "JSZip library not loaded yet. Please wait a moment and try again.",
            );
            return;
        }

        const zip = new JSZip();
        for (const [path, content] of Object.entries(config.files)) {
            const filePath = path.startsWith("/") ? path.substring(1) : path;
            zip.file(filePath, content as string);
        }

        zip.generateAsync({ type: "blob" }).then((content: Blob) => {
            const url = URL.createObjectURL(content);
            const a = document.createElement("a");
            a.href = url;
            a.download = `martini-kit-${gameId}-${Date.now()}.zip`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }
</script>

<svelte:head>
    <title>{metadata?.title || "Game Editor"} - martini-kit</title>
    <script
        src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
    ></script>
</svelte:head>

{#if config && metadata}
    <div class="editor-page">
        <div class="editor-header">
            <a href="/play" class="back-link">← Back to Play</a>
            <div class="game-switcher">
                <label for="game-select">Game:</label>
                <select
                    id="game-select"
                    value={gameId}
                    onchange={(e) =>
                        (window.location.href = `/editor/${e.currentTarget.value}`)}
                >
                    {#each Object.entries(gameMetadata) as [id, meta]}
                        <option value={id}>{meta.title}</option>
                    {/each}
                </select>
            </div>
        </div>
        <MartiniIDE {config} onDownload={downloadCode} />
    </div>
{:else}
    <div class="error-page">
        <div class="container">
            <h1>Game Not Found</h1>
            <p>The game "{gameId}" does not have an editor available.</p>
            <a href="/" class="btn">Back to Home</a>
        </div>
    </div>
{/if}

<style>
    .editor-page {
        width: 100%;
        height: calc(100vh - 64px);
        display: flex;
        flex-direction: column;
        background: var(--bg-page);
        color: var(--text);
        overflow: hidden;
    }

    .editor-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1.5rem;
        background: rgba(255, 255, 255, 0.95);
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
    }

    .back-link {
        color: var(--muted-2);
        text-decoration: none;
        font-weight: 500;
        font-size: 0.9rem;
        transition: color 0.2s;
    }

    .back-link:hover {
        color: var(--text);
    }

    .game-switcher {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .game-switcher label {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--muted-2);
    }

    .game-switcher select {
        padding: 0.5rem 0.75rem;
        border-radius: 8px;
        border: 1px solid var(--border);
        background: #ffffff;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: border-color 0.2s;
    }

    .game-switcher select:hover {
        border-color: var(--border-strong);
    }

    .game-switcher select:focus {
        outline: none;
        border-color: var(--accent);
    }
    .error-page {
        min-height: calc(100vh - 64px);
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        background: var(--bg-page);
        color: var(--text);
    }

    .container {
        max-width: 600px;
        padding: 2rem;
    }

    .error-page h1 {
        font-size: 2.5rem;
        font-weight: 700;
        margin: 0 0 1rem 0;
    }

    .error-page p {
        font-size: 1.125rem;
        color: var(--muted);
        margin: 0 0 2rem 0;
    }

    .error-page .btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        background: rgba(255, 255, 255, 0.06);
        color: var(--text);
        border-radius: 10px;
        font-weight: 600;
        text-decoration: none;
        transition: background 0.2s;
        border: 1px solid var(--border);
    }

    .error-page .btn:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: var(--border-strong);
    }
</style>
