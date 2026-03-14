import { useCallback, useState } from 'react';

export function useModalEntityEditor<T>() {
  const [editingEntity, setEditingEntity] = useState<T | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openForCreate = useCallback(() => {
    setEditingEntity(null);
    setIsOpen(true);
  }, []);

  const openForEdit = useCallback((entity: T) => {
    setEditingEntity(entity);
    setIsOpen(true);
  }, []);

  const closeEditor = useCallback(() => {
    setIsOpen(false);
    setEditingEntity(null);
  }, []);

  return {
    isOpen,
    editingEntity,
    isEditing: editingEntity !== null,
    openForCreate,
    openForEdit,
    closeEditor,
  };
}