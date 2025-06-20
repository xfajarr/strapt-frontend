import { TokenType } from '@/types/tokens';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TokenSelectorProps {
  value: TokenType;
  onChange: (value: TokenType) => void;
}

export function TokenSelector({ value, onChange }: TokenSelectorProps) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant={value === 'USDC' ? 'default' : 'outline'}
        className={cn(
          'flex-1',
          value === 'USDC' && 'bg-blue-500 hover:bg-blue-600'
        )}
        onClick={() => onChange('USDC')}
      >
        USDC
      </Button>
      <Button
        type="button"
        variant={value === 'USDT' ? 'default' : 'outline'}
        className={cn(
          'flex-1',
          value === 'USDT' && 'bg-green-500 hover:bg-green-600'
        )}
        onClick={() => onChange('USDT')}
      >
        USDT
      </Button>
    </div>
  );
}