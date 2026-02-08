import { Dialog, DialogButton } from 'konsta/react'

interface ConfirmDialogProps {
  opened: boolean
  title: string
  content: string
  confirmText?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  opened,
  title,
  content,
  confirmText = 'Löschen',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      opened={opened}
      onBackdropClick={onCancel}
      title={title}
      content={content}
      buttons={
        <>
          <DialogButton onClick={onCancel}>Abbrechen</DialogButton>
          <DialogButton strong onClick={onConfirm} className="text-red-500">
            {confirmText}
          </DialogButton>
        </>
      }
    />
  )
}
