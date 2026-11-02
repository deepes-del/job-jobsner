(async () => {
  try {
    const App = await import('./src/App.tsx');
    console.log('SUCCESS: App imported successfully! Default export is:', typeof App.default);
  } catch (err) {
    console.error('FAILURE: Error loading App.tsx:', err);
  }
})();

