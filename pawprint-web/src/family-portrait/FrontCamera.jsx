import {useEffect, useEffectEvent, useRef, useState} from 'react';
import {encodePhoto} from './prepare-photo.js';

export default function FrontCamera({copy, onClose, onCapture}) {
  const dialog = useRef(null);
  const video = useRef(null);
  const close = useEffectEvent(onClose);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [issue, setIssue] = useState(null);
  const [shot, setShot] = useState(null);

  useEffect(() => {
    const element = dialog.current;
    const leave = () => close();
    const onHidden = () => { if (document.hidden) leave(); };
    element.showModal();
    window.addEventListener('pagehide', leave);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      element.close();
      window.removeEventListener('pagehide', leave);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, []);

  useEffect(() => {
    if (shot) return () => URL.revokeObjectURL(shot.url);
    const preview = video.current;
    let cancelled = false;
    let stream;
    const stop = () => {
      cancelled = true;
      stream?.getTracks().forEach(track => track.stop());
      preview.srcObject = null;
    };

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setIssue('cameraUnavailable');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {facingMode: {ideal: 'user'}, width: {ideal: 1440}, height: {ideal: 1080}}
        });
        if (cancelled) return stop();
        const track = stream.getVideoTracks()[0];
        if (track?.getSettings().facingMode === 'environment') {
          stop();
          setIssue('cameraUnavailable');
          return;
        }
        track?.addEventListener('ended', () => {
          if (cancelled) return;
          stop();
          setReady(false);
          setIssue('cameraUnavailable');
        }, {once: true});
        preview.srcObject = stream;
        await preview.play();
        if (!cancelled) setReady(true);
      } catch (error) {
        if (cancelled) return;
        stop();
        setIssue(error.name === 'NotAllowedError' ? 'cameraDenied' : 'cameraUnavailable');
      }
    }
    void start();
    return stop;
  }, [shot]);

  async function capture() {
    const preview = video.current;
    setCapturing(true);
    setIssue(null);
    try {
      const photo = await encodePhoto(preview, preview.videoWidth, preview.videoHeight);
      if (video.current && preview.srcObject) {
        setReady(false);
        setShot({photo, url: URL.createObjectURL(photo)});
      }
    } catch {
      if (video.current) setIssue('cameraCaptureFailed');
    } finally {
      if (video.current) setCapturing(false);
    }
  }

  return <dialog ref={dialog} className="camera-dialog" aria-labelledby="camera-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2 id="camera-title">{copy.frontCamera}</h2>
    {shot ? <img className="camera-shot" src={shot.url} alt={copy.cameraPhoto} /> :
      <video ref={video} muted autoPlay playsInline aria-label={copy.cameraPreview} />}
    {issue ? <p className="camera-status" role="alert">{copy[issue]}</p> :
      <p className="camera-status" role="status">{shot || ready ? '' : copy.cameraStarting}</p>}
    <div className="camera-actions">
      <button type="button" onClick={onClose}>{copy.cameraClose}</button>
      {shot ? <>
        <button type="button" className="camera-retake" onClick={() => {setIssue(null); setShot(null);}}>{copy.cameraRetake}</button>
        <button type="button" className="generate" onClick={() => onCapture(shot.photo)}>{copy.cameraUse}</button>
      </> : <button type="button" className="generate" disabled={!ready || capturing} onClick={capture}>{copy.cameraTake}</button>}
    </div>
  </dialog>;
}
