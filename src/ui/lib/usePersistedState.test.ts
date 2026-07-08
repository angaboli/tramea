import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistedState } from './usePersistedState';

describe('usePersistedState', () => {
  beforeEach(() => localStorage.clear());

  it('démarre avec la valeur initiale si rien de sauvegardé', () => {
    const { result } = renderHook(() => usePersistedState('foo', 'a'));
    expect(result.current[0]).toBe('a');
  });

  it('persiste et relit la valeur (nouvelle instance du hook)', () => {
    const { result, unmount } = renderHook(() => usePersistedState('foo', 'a'));
    act(() => result.current[1]('b'));
    expect(result.current[0]).toBe('b');
    unmount();

    const { result: result2 } = renderHook(() => usePersistedState('foo', 'a'));
    expect(result2.current[0]).toBe('b');
  });

  it('préfixe la clé localStorage avec "tramea."', () => {
    const { result } = renderHook(() => usePersistedState('bar', 1));
    act(() => result.current[1](42));
    expect(localStorage.getItem('tramea.bar')).toBe('42');
  });
});
