// @ts-nocheck — plain JS logic lives in payments.js (shared by all four functions).
import { makeHandler } from './payments.js';

Deno.serve(makeHandler('razorpay-webhook', Deno.env.toObject(), fetch));
