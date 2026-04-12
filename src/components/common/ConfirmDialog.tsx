import { Dialog, DialogButton } from 'konsta/react'

interface ConfirmDialogProps {
  opened: boolean
  title: string
  content: string
  confirmText?: string
  centered?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  opened,
  title,
  content,
  confirmText = 'Löschen',
  centered,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      opened={opened}
      onBackdropClick={onCancel}
      title={title}
      content={centered ? <div style={{ textAlign: 'center' }}>{content}</div> : content}
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
