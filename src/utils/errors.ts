export class HubSpotError extends Error {
  constructor(public statusCode: number, message: string) {
    super(`HubSpot API Error (${statusCode}): ${message}`);
    this.name = 'HubSpotError';
  }
}

export class MCPConfigError extends Error {
  constructor(message: string) {
    super(`Configuration Error: ${message}`);
    this.name = 'MCPConfigError';
  }
}
