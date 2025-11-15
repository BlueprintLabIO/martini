const logBuffers = /* @__PURE__ */ new Map();
function getConsoleLogs(projectId, limit = 20) {
  const logs = logBuffers.get(projectId) || [];
  return logs.slice(-limit);
}
function clearConsoleLogs(projectId) {
  logBuffers.set(projectId, []);
}

export { clearConsoleLogs as c, getConsoleLogs as g };
//# sourceMappingURL=game-console-output-Cf653Jc9.js.map
