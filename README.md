# e2ee-file-drop

b2 cli
b2 update-bucket --corsRules '[...]' your-bucket-name allPrivate

# local dev

## Start dev server with functions
netlify dev

## Or separately:
npm run dev  # Frontend on :5173
netlify functions:serve  # Functions on :9999