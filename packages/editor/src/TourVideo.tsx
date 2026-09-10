import { useRef } from 'react'
import { t } from '@merkzeug/core/i18n'
const videoUrl = new URL('../../../resources/tour/guided-tour-de.mp4', import.meta.url).href
export function TourVideo() {
  const dialog = useRef<HTMLDialogElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  return <><button className="tour-launch" onClick={() => dialog.current?.showModal()}>{t('Desktop tour video (German)')}</button>
    <dialog className="tour-video" ref={dialog} aria-label={t('Desktop tour video (German)')} onClose={() => video.current?.pause()}>
      <button onClick={() => dialog.current?.close()}>{t('Close')}</button>
      <video ref={video} controls playsInline preload="none" src={videoUrl} aria-label={t('Desktop tour video (German)')} />
    </dialog></>
}
