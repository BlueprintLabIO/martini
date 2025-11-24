<script lang="ts">
  const competitors = ['Martini', 'Colyseus', 'Photon', 'Rune'];

  const rows = [
    { feature: 'Declarative game logic', values: ['✓', 'RPC heavy', 'RPC heavy', '~'] },
    { feature: 'Transport: P2P + server', values: ['✓', 'Server only', 'Server only', 'P2P only'] },
    { feature: 'Automatic conflict handling', values: ['✓', 'Manual locks', 'Manual locks', 'Manual'] },
    { feature: 'Tiny sync payloads', values: ['✓', 'Bulk state', 'Bulk state', 'Batched RPCs'] },
    { feature: 'Open source (Apache 2.0)', values: ['✓', 'Varies', 'No', 'No'] },
    { feature: 'Works offline / static deploy', values: ['✓', 'No', 'No', 'No'] },
    { feature: 'Engine agnostic (Phaser/JS/TS)', values: ['✓', '~', '~', '~'] },
    { feature: 'Host-authoritative ready', values: ['✓', '~', 'Manual', 'Manual'] }
  ];
</script>

<section id="comparison" class="comparison-section">
  <div class="section-container">
    <h2 class="section-title" data-text="Comparison Snapshot">Comparison Snapshot</h2>
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
    max-width: 900px;
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
