// Nitro inlines a file imported with the "raw:" prefix. A .graphql file has no
// text MIME type, so it is inlined as bytes.
declare module 'raw:*.graphql' {
  const content: Uint8Array
  export default content
}
