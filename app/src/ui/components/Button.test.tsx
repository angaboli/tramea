import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('affiche son contenu', () => {
    render(<Button>Exporter</Button>);
    expect(screen.getByRole('button', { name: 'Exporter' })).toBeInTheDocument();
  });

  it('déclenche onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Ok</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Ok' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('respecte disabled', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Ok
      </Button>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
