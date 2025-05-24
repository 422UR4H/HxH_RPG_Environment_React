export default function config(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}
