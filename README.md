# e2ee-file-drop

A serverless prototype for end-to-end encrypted file drops. A recipient
opens a drop session and shares the link; a sender uploads a file to it,
encrypted in the browser with the recipient's public key. The server only
ever handles ciphertext.

**Status:** Archived prototype (October 2025). Superseded by
[e2ee-drop](https://github.com/bjafl/e2ee-drop), a self-hosted rewrite with
accounts, key recovery and permanent links.

## How it works

1. The recipient's browser generates a NaCl key pair
   ([tweetnacl](https://github.com/dchest/tweetnacl-js)) and registers the
   public key with a new session. The session expires after 24 hours; the
   private key never leaves the recipient's browser (kept in
   `localStorage` with the same 24-hour expiry).
2. The sender's browser generates its own key pair, encrypts the file with
   `nacl.box` against the recipient's public key in a Web Worker, and
   uploads the ciphertext straight to Backblaze B2 through a presigned URL.
3. The recipient downloads the ciphertext through another presigned URL
   and decrypts it locally.
4. Session state and file metadata live in Netlify Blobs; a scheduled
   function deletes expired sessions daily.

## Tech stack

| Part | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, Tailwind CSS 4, Radix UI, react-i18next (Norwegian/English) |
| Crypto | tweetnacl (`box`: X25519 + XSalsa20-Poly1305), Web Worker |
| Backend | Netlify Functions, Netlify Blobs |
| Storage | Backblaze B2 via the S3 API (presigned URLs) |

## Running it

Requires Node.js 24, the Netlify CLI and a private B2 bucket.

```bash
npm install
cp .env.example .env   # B2 region, endpoint, bucket and application key
npm run netlify:dev    # frontend + functions via Netlify Dev
```

The bucket needs CORS rules that allow browser uploads and downloads; see
`cors-rules-backblaze.json` and apply them with the B2 CLI:

```bash
b2 update-bucket --corsRules "$(cat cors-rules-backblaze.json)" <bucket-name> allPrivate
```

## Limitations

- The whole file is encrypted in memory in one `box` call, so large files
  are limited by browser memory.
- The recipient's private key lives in one browser's `localStorage`; clear
  it or switch device and the file can no longer be decrypted.
- No accounts and no tests. These were the main reasons for the rewrite.

## License

MIT — see [LICENSE](LICENSE).
