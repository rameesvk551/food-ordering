import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';

const OrderSuccessPage = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="premium-shell min-h-screen flex items-center justify-center p-4">
      <div className="premium-panel text-center animate-bounce-in rounded-3xl px-8 py-10 max-w-md w-full">
        <div className="w-24 h-24 bg-[#2b2419] border border-[#604d30] rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-success">
          <CheckCircle className="w-12 h-12 text-[#f2a63a]" />
        </div>
        <h1 className="premium-title text-5xl font-semibold mb-2">Order Placed!</h1>
        <p className="text-[#c2b4a1] mb-1 max-w-sm">
          Your order has been received and is being prepared. We'll update you via WhatsApp.
        </p>
        <p className="text-[#8f8578] text-sm mb-8">
          Sit back and relax, your food is on the way.
        </p>

        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Button
            onClick={() => navigate(`/${slug}`)}
            variant="accent"
            size="lg"
            className="w-full"
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Order More
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
