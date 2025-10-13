

export default function MainPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="mb-4 text-4xl font-bold text-gray-800">Velkommen til E2EE File Drop</h1>
      <p className="mb-8 text-gray-600">Sikker deling av filer med ende-til-ende kryptering</p>
      <div className="flex space-x-4">
        <a href="/create" className="rounded bg-blue-600 px-6 py-3 text-white hover:bg-blue-700">
          Motta fil
        </a>
        <a href="/download" className="rounded bg-green-600 px-6 py-3 text-white hover:bg-green-700">
          Last ned fil
        </a>
      </div>
    </div>
  );
}