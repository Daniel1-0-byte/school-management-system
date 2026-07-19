interface Window {
  grecaptcha: {
    execute(siteKey: string, options: { action: string }): Promise<string>;
    render(element: string, options: unknown): void;
  };
}
