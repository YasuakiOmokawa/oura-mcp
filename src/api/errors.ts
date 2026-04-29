export class OuraApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`Oura API ${status}`);
    this.name = 'OuraApiError';
  }
}
