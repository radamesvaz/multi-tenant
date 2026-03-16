// Shared notification composable placeholder.

export function useNotification() {
  const notifySuccess = (message: string) => {
    // Implementation will be added later.
    console.info('SUCCESS:', message);
  };

  const notifyError = (message: string) => {
    // Implementation will be added later.
    console.error('ERROR:', message);
  };

  return {
    notifySuccess,
    notifyError,
  };
}

