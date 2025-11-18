export default function EnvError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            ⚠️ Configuration Required
          </h1>
          <p className="text-gray-700 mb-6">
            Supabase environment variables are missing. Please create a <code className="bg-gray-100 px-2 py-1 rounded">.env</code> file in the <code className="bg-gray-100 px-2 py-1 rounded">frontend</code> directory.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-6 text-left mb-6">
            <h2 className="font-semibold mb-3">Create <code>.env</code> file with:</h2>
            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
{`VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key`}
            </pre>
          </div>

          <div className="text-sm text-gray-600">
            <p className="mb-2">You can find these values in your Supabase project:</p>
            <ol className="list-decimal list-inside space-y-1 text-left max-w-md mx-auto">
              <li>Go to your Supabase project dashboard</li>
              <li>Navigate to Settings → API</li>
              <li>Copy the "Project URL" and "anon public" key</li>
              <li>Add them to your <code className="bg-gray-100 px-1 rounded">.env</code> file</li>
              <li>Restart the dev server</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

