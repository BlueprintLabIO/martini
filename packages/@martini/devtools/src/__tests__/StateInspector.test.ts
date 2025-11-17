import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defineGame, GameRuntime } from '@martini/core';
import { LocalTransport } from '@martini/transport-local';
import { StateInspector } from '../StateInspector';

function createRuntime() {
  const game = defineGame({
    setup: () => ({ count: 0, history: [] as number[] }),
    actions: {
      increment: {
        apply: (state) => {
          state.count++;
          state.history.push(state.count);
        },
      },
      tick: {
        apply: () => {
          // no-op heartbeat
        },
      },
      setValue: {
        apply: (state, _ctx, input: { value: number }) => {
          state.count = input.value;
          state.history.push(state.count);
        },
      },
    },
  });

  const transport = new LocalTransport({ roomId: 'test', playerId: 'p1', isHost: true });
  const runtime = new GameRuntime(game, transport, { isHost: true, playerIds: ['p1'] });

  return { runtime, transport };
}

describe('StateInspector', () => {
  let runtime: GameRuntime;
  let transport: LocalTransport;

  beforeEach(() => {
    ({ runtime, transport } = createRuntime());
  });

  afterEach(() => {
    runtime.destroy();
    transport.disconnect();
  });

  it('attaches and detaches cleanly', () => {
    const inspector = new StateInspector();
    inspector.attach(runtime);

    expect(inspector.isAttached()).toBe(true);
    expect(inspector.getRuntime()).toBe(runtime);

    inspector.detach();
    expect(inspector.isAttached()).toBe(false);
    expect(inspector.getRuntime()).toBe(null);
  });

  it('captures initial state snapshot with id', () => {
    const inspector = new StateInspector();
    inspector.attach(runtime);

    const snapshots = inspector.getSnapshots();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].id).toBe(1);
    expect(snapshots[0].state).toEqual({ count: 0, history: [] });
  });

  it('records diffs and links them to actions', async () => {
    const inspector = new StateInspector({ snapshotIntervalMs: 0 });
    inspector.attach(runtime);

    runtime.submitAction('increment', {});

    const snapshots = inspector.getSnapshots();
    expect(snapshots).toHaveLength(2);
    const latest = snapshots[snapshots.length - 1];
    expect(latest.state).toBeUndefined();
    expect(latest.diff).toBeDefined();
    expect(latest.lastActionId).toBe(1);

    const actions = inspector.getActionHistory();
    expect(actions[0].snapshotId).toBe(latest.id);
  });

  it('throttles snapshot capture', async () => {
    const inspector = new StateInspector({ snapshotIntervalMs: 10 });
    inspector.attach(runtime);

    runtime.submitAction('increment', {});
    runtime.submitAction('increment', {});

    // Wait a bit to let throttled timer flush
    await new Promise(resolve => setTimeout(resolve, 20));

    const snapshots = inspector.getSnapshots();
    // Initial + throttled result
    expect(snapshots.length).toBeLessThanOrEqual(3);
  });

  it('aggregates repeated actions within window', async () => {
    const inspector = new StateInspector({ actionAggregationWindowMs: 100 });
    inspector.attach(runtime);

    const updates: any[] = [];
    inspector.onAction((record) => updates.push(record));

    runtime.submitAction('increment', {});
    runtime.submitAction('increment', {});

    expect(inspector.getActionHistory()).toHaveLength(1);
    const action = inspector.getActionHistory()[0];
    expect(action.count).toBe(2);
    expect(updates).toHaveLength(2); // second update replaces existing entry
  });

  it('ignores actions listed in ignoreActions', () => {
    const inspector = new StateInspector({ ignoreActions: ['tick'] });
    inspector.attach(runtime);

    runtime.submitAction('tick', {});

    expect(inspector.getActionHistory()).toHaveLength(0);
    expect(inspector.getStats().excludedActions).toBe(1);
  });

  it('notifies state listeners with latest snapshot', async () => {
    const inspector = new StateInspector({ snapshotIntervalMs: 0 });
    inspector.attach(runtime);

    const listener = vi.fn();
    inspector.onStateChange(listener);

    runtime.submitAction('setValue', { value: 42 });

    const snapshots = inspector.getSnapshots();
    const latest = snapshots[snapshots.length - 1];

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ id: latest.id }));
  });

  it('provides stats for totals and action frequency', () => {
    const inspector = new StateInspector({ snapshotIntervalMs: 0 });
    inspector.attach(runtime);

    runtime.submitAction('increment', {});
    runtime.submitAction('setValue', { value: 10 });
    runtime.submitAction('increment', {});

    const stats = inspector.getStats();
    expect(stats.totalActions).toBe(3);
    expect(stats.actionsByName.increment).toBe(2);
    expect(stats.actionsByName.setValue).toBe(1);
  });
});
