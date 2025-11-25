<script lang="ts">
  const competitors = ["Martini (Phaser today)", "Colyseus", "Photon", "Rune", "Manual"];

  const rows = [
    { feature: "Declarative game logic", values: ["✓", "RPC / manual", "RPC / manual", "Custom", "x"] },
    { feature: "Engine helper", values: ["✓ (Phaser)", "~", "Per-engine SDKs", "P2P SDK", "x"] },
    { feature: "Transport choice", values: ["✓", "Server WS", "Server UDP/WS", "P2P only", "x"] },
    { feature: "Reconnect & ordering", values: ["✓", "Manual", "Manual", "Manual", "x"] },
    { feature: "Bandwidth optimized", values: ["✓", "Full state / manual", "Manual", "Batched", "x"] },
    { feature: "Optimistic updates", values: ["✓", "Manual", "Manual", "Manual", "x"] },
    { feature: "Interpolation/reconciliation helpers", values: ["✓", "Manual", "Manual", "Manual", "x"] },
    { feature: "Swap transports without refactor", values: ["✓", "Server only", "Server only", "P2P only", "x"] },
    { feature: "Host-authoritative or P2P", values: ["✓", "Server only", "Server only", "P2P only", "x"] },
    { feature: "Schema-free state", values: ["✓", "Manual", "Manual", "Manual", "x"] },
    { feature: "Plugin adapters (Godot planned)", values: ["✓", "~", "~", "~", "x"] },
    { feature: "Open source", values: ["✓", "Varies", "No", "No", "x"] },
    { feature: "Local-first friendly", values: ["✓", "Server only", "Server only", "P2P only", "x"] },
  ];
</script>

<section id="comparison" class="comparison-section">
  <div class="section-container">
    <h2 class="section-title" data-text="Comparison Snapshot">
      Comparison Snapshot
    </h2>
    <div class="comparison-table">
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            {#each competitors as competitor, index}
              <th class:highlight-col={index === 0}>{competitor}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each rows as row}
            <tr>
              <td>{row.feature}</td>
              {#each row.values as value, index}
                <td class:highlight-col={index === 0}>{value}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</section>

<style>
  .comparison-section {
    padding: 5rem 0;
  }

  .comparison-table {
    max-width: 1100px;
    margin: 0 auto;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 0.9rem;
    box-shadow: 0 14px 28px rgba(15, 23, 42, 0.12);
  }

  th,
  td {
    padding: 1rem;
    text-align: center;
  }

  thead th {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.85rem;
    color: var(--muted-2);
  }

  tbody tr:nth-child(even) {
    background: rgba(255, 255, 255, 0.02);
  }

  td:first-child,
  th:first-child {
    text-align: left;
  }

  .highlight-col {
    color: var(--accent);
    font-weight: 700;
  }
</style>
