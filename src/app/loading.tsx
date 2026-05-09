export default function GlobalLoading() {
  return (
    <div className="flex flex-col gap-4 w-full h-[80vh] items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#EBF4FF] border-t-[#2657c1] rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium animate-pulse">Loading...</p>
    </div>
  );
}