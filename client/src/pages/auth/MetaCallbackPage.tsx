import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const MetaCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  useEffect(() => {
    if (window.opener) {
      if (code) {
        window.opener.postMessage({ type: 'WA_EMBEDDED_CODE', code }, '*');
      } else if (error) {
        window.opener.postMessage({ type: 'WA_EMBEDDED_ERROR', error }, '*');
      }
      window.close();
    }
  }, [code, error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="animate-spin w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full mb-4" />
      <h2 className="text-xl font-bold mb-2">Connecting to Meta...</h2>
      <p className="text-gray-600">Please wait while we complete the connection. This window will close automatically.</p>
    </div>
  );
};

export default MetaCallbackPage;
