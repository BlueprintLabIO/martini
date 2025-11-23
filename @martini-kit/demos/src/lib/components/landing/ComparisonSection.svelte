<script lang="ts">
  const competitors = ['Martini', 'Colyseus', 'Photon', 'Rune'];

  const rows = [
    { feature: 'Declarative API', values: ['✓', '✗', '✗', '~'] },
    { feature: 'Zero Server', values: ['✓', '✗', '✗', '✗'] },
    { feature: 'P2P Support', values: ['✓', '✗', '✗', '✗'] },
    { feature: 'Patch Efficiency', values: ['✓', '✗', '✓', '✓'] }
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
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(0, 255, 255, 0.2);
    border-radius: 0.75rem;
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
    color: rgba(224, 224, 255, 0.7);
  }

  tbody tr:nth-child(even) {
    background: rgba(255, 255, 255, 0.02);
  }

  td:first-child,
  th:first-child {
    text-align: left;
  }

  .highlight-col {
    color: #00ffff;
    font-weight: 700;
  }
</style>
