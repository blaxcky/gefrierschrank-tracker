import { useRegisterSW } from 'virtual:pwa-register/react'
import { Dialog, DialogButton } from 'konsta/react'

export default function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  return (
    <Dialog
      opened={needRefresh}
      title="Update verfügbar"
      content="Eine neue Version der App ist verfügbar."
      buttons={
        <>
          <DialogButton onClick={() => setNeedRefresh(false)}>
            Später
          </DialogButton>
          <DialogButton strong onClick={() => updateServiceWorker(true)}>
            Aktualisieren
          </DialogButton>
        </>
      }
    />
  )
}
