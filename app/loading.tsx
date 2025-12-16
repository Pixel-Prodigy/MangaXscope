export default function Loading() {
  return (
    <div
      style={{ zIndex: 99999 }}
      className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-black"
    >
      <img src="/loading.gif" alt="Loading" className="w-56" />
    </div>
  );
}

