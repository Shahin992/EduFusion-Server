declare module 'serverless-http' {
  function serverless(app: unknown): (req: unknown, res: unknown) => Promise<unknown>;
  export default serverless;
}
