// Express type shim to ensure generic Response/Request recognized
import 'express';
declare module 'express-serve-static-core' {
  interface Response { }
  interface Request { }
}