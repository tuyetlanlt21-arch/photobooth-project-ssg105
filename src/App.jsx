import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FRAME_LIST, PHOTO_COUNT, getFrameById } from './data/frames';
import { composePhotobooth, FILTERS } from './utils/canvas';
import { downloadBlob, photoboothFilename } from './utils/download';

const SCREENS = { HOME: 'home', FRAME: 'frame', CAMERA: 'camera', REVIEW: 'review' };
const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
const stopStream = (stream) => stream?.getTracks().forEach((track) => track.stop());
const errorText = (error) => ({
  NotAllowedError: 'Camera permission was denied. Allow camera access and try again.',
  NotFoundError: 'No camera was found. Connect a camera and try again.',
  NotReadableError: 'Your camera is in use by another app. Close it and try again.',
  OverconstrainedError: 'This camera does not support the requested settings.'
}[error?.name] || 'We could not open the camera. Please try again.');

function Button({ children, secondary = false, className = '', ...props }) {
  return <button className={`button ${secondary ? 'secondary' : ''} ${className}`} {...props}>{children}</button>;
}

function Header({ home }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={home} aria-label="Return to home">
        <span className="brand-mark">♥</span>
        <span>photobooth<small>CAPTURE THE MOMENT</small></span>
      </button>
      <span className="top-note">Cherish the magic</span>
    </header>
  );
}

function FramePreview({ frame, photos = [], filter = 'original' }) {
  return (
    <div className="strip-preview" style={{ aspectRatio: `${frame.canvas.width} / ${frame.canvas.height}` }}>
      <div className="strip-slots" aria-hidden="true">
        {frame.slots.map((slot, index) => (
          <div
            className="strip-slot"
            key={`${frame.id}-${slot.y}-${index}`}
            style={{
              left: `${(slot.x / frame.canvas.width) * 100}%`,
              top: `${(slot.y / frame.canvas.height) * 100}%`,
              width: `${(slot.width / frame.canvas.width) * 100}%`,
              height: `${(slot.height / frame.canvas.height) * 100}%`
            }}
          >
            {photos[index] ? (
              <img src={photos[index]} alt="" style={{ filter: FILTERS[filter].css }} />
            ) : (
              <span>{index + 1}</span>
            )}
          </div>
        ))}
      </div>
      <img className="strip-overlay" src={frame.thumbnail} alt={`${frame.name} frame`} />
    </div>
  );
}

function FrameGrid({ selectedId, onSelect, compact = false }) {
  return (
    <div className={compact ? 'frame-row' : 'frame-grid'}>
      {FRAME_LIST.map((frame) => (
        <button
          type="button"
          key={frame.id}
          className={`frame-choice ${selectedId === frame.id ? 'active' : ''}`}
          onClick={() => onSelect(frame.id)}
          aria-label={`Select frame ${frame.name}`}
          aria-pressed={selectedId === frame.id}
        >
          <FramePreview frame={frame} />
          <span>{frame.name}</span>
        </button>
      ))}
    </div>
  );
}

function PhotoRail({ photos, current, onRetake }) {
  return (
    <aside className="photo-rail">
      <h2>Your photos</h2>
      <p>FOUR CUTS · ONE SPECIAL MOMENT</p>
      <div className="progress-list">
        {Array.from({ length: PHOTO_COUNT }, (_, index) => {
          const state = photos[index] ? 'slot-completed' : index === current ? 'slot-current' : 'slot-empty';
          return (
            <button
              type="button"
              key={`slot-${index + 1}`}
              className={`progress-shot ${state}`}
              disabled={!photos[index] || !onRetake}
              onClick={() => onRetake?.(index)}
              aria-label={photos[index] ? `Retake photo ${index + 1}` : `Photo ${index + 1}`}
            >
              {photos[index] ? (
                <img src={photos[index]} alt={`Captured photo ${index + 1}`} />
              ) : (
                <span>{index + 1}</span>
              )}
              <small>{photos[index] ? 'captured' : index === current ? 'next' : 'waiting'}</small>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function Home({ start }) {
  return (
    <main className="welcome">
      <section className="welcome-copy">
        <p className="eyebrow">Photobooth</p>
        <h1>Capture the moment, cherish the magic.</h1>
        <p className="subtitle">Four frames. One small piece of today. Relive the love.</p>
        <Button onClick={start}>Start →</Button>
      </section>
      <div className="welcome-strip">
        <FramePreview frame={FRAME_LIST[0]} />
      </div>
    </main>
  );
}

function FrameSelector({ frame, select, back, proceed }) {
  return (
    <main className="page frame-screen">
      <section className="section-title">
        <p className="eyebrow">Choose your frame</p>
        <h1>Pick a look for today.</h1>
        <p>Your selected frame will be used for the final four-shot strip.</p>
      </section>
      <div className="frame-layout">
        <div className="large-frame-preview">
          <FramePreview frame={frame} />
          <div>
            <b>{frame.name}</b>
            <span>4 shots · vertical strip</span>
          </div>
        </div>
        <section className="frame-picker">
          <FrameGrid selectedId={frame.id} onSelect={select} />
        </section>
      </div>
      <div className="page-actions">
        <Button secondary onClick={back}>Back</Button>
        <Button onClick={proceed}>Open Camera</Button>
      </div>
    </main>
  );
}

function Camera({ photos, setPhotos, review, frames, back }) {
  const video = useRef(null);
  const stream = useRef(null);
  const cancelled = useRef(false);
  const alive = useRef(true);
  const [status, setStatus] = useState('opening');
  const [countdown, setCountdown] = useState(null);
  const [flash, setFlash] = useState(false);
  const [notice, setNotice] = useState('');
  const [retakeIndex, setRetakeIndex] = useState(null);

  const stop = useCallback(() => {
    stopStream(stream.current);
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);

  const open = useCallback(async () => {
    stop();
    cancelled.current = false;
    setStatus('opening');
    setNotice('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      setNotice('Camera access is not supported by this browser.');
      return;
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', aspectRatio: { ideal: 4 / 3 } },
        audio: false
      });
      if (!alive.current || cancelled.current) {
        stopStream(newStream);
        return;
      }
      stream.current = newStream;
      video.current.srcObject = newStream;
      await video.current.play();
      if (alive.current) setStatus('ready');
    } catch (error) {
      if (alive.current) {
        setStatus('error');
        setNotice(errorText(error));
      }
    }
  }, [stop]);

  useEffect(() => {
    alive.current = true;
    open();
    return () => {
      alive.current = false;
      cancelled.current = true;
      stop();
    };
  }, [open, stop]);

  const nextIndex = retakeIndex ?? photos.findIndex((photo) => !photo);
  const running = status === 'running';

  const cancel = (clear = false) => {
    cancelled.current = true;
    setCountdown(null);
    setFlash(false);
    setRetakeIndex(null);
    setStatus('ready');
    if (clear) setPhotos(Array(PHOTO_COUNT).fill(null));
  };

  const capture = () => {
    if (!video.current?.videoWidth) throw new Error('Camera is not ready yet.');
    const canvas = document.createElement('canvas');
    canvas.width = video.current.videoWidth;
    canvas.height = video.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.92);
  };

  const session = async () => {
    if (running || status !== 'ready' || nextIndex < 0) return;
    cancelled.current = false;
    setStatus('running');
    let working = [...photos];
    const sessionEnd = retakeIndex === null ? PHOTO_COUNT : retakeIndex + 1;
    for (let index = nextIndex; index < sessionEnd && !cancelled.current; index += 1) {
      for (let count = 3; count > 0 && !cancelled.current; count -= 1) {
        setCountdown(count);
        await wait(700);
      }
      if (cancelled.current) break;
      setCountdown(null);
      try {
        working[index] = capture();
        setPhotos([...working]);
        setFlash(true);
        await wait(240);
        setFlash(false);
        setNotice(`Photo ${index + 1} of ${PHOTO_COUNT} captured`);
        await wait(620);
      } catch (error) {
        setNotice(error.message);
        break;
      }
    }
    if (!cancelled.current && working.every(Boolean)) {
      setStatus('ready');
      window.setTimeout(review, 250);
    } else if (!cancelled.current) setStatus('ready');
  };

  const retake = (index) => {
    if (!running) {
      const next = [...photos];
      next[index] = null;
      setPhotos(next);
      setRetakeIndex(index);
    }
  };

  return (
    <main className="page camera-page">
      <div className="camera-top">
        <p className="eyebrow">Automatic {PHOTO_COUNT}-shot session</p>
        <h1>{retakeIndex === null ? 'Ready when you are.' : `Retake photo ${retakeIndex + 1}`}</h1>
      </div>
      <div className="camera-layout">
        <section className="camera-zone">
          <div className="camera-card">
            {status !== 'error' && <video ref={video} autoPlay muted playsInline />}
            {status === 'opening' && (
              <div className="camera-message">
                <b>Opening camera...</b>
                <span>Your photos stay on this device.</span>
              </div>
            )}
            {status === 'error' && (
              <div className="camera-message">
                <b>Camera unavailable</b>
                <span>{notice}</span>
                <Button onClick={open}>Try again</Button>
              </div>
            )}
            {countdown && <div className="countdown" aria-live="assertive">{countdown}</div>}
            {flash && <div className="flash" />}
          </div>
          {notice && status !== 'error' && (
            <p className="capture-notice" aria-live="polite">{notice}</p>
          )}
          <div className="camera-actions">
            <Button secondary onClick={back} disabled={running}>Back</Button>
            {running ? (
              <Button secondary onClick={() => cancel()}>Cancel Session</Button>
            ) : (
              <Button onClick={session} disabled={status !== 'ready' || nextIndex < 0}>
                {retakeIndex === null ? `Start ${PHOTO_COUNT}-Shot Session` : 'Retake Photo'}
              </Button>
            )}
            <button
              type="button"
              className="shutter"
              onClick={session}
              disabled={running || status !== 'ready' || nextIndex < 0}
              aria-label="Start photo session"
            />
          </div>
          <button type="button" className="text-action" onClick={() => cancel(true)} disabled={running}>
            Reset photos
          </button>
        </section>
        <div>
          <PhotoRail photos={photos} current={nextIndex < 0 ? PHOTO_COUNT : nextIndex} onRetake={retake} />
          <div className="rail-frame">
            <b>Selected frame</b>
            <Button secondary onClick={frames} disabled={running}>Change frame</Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Review({ frame, photos, filter, setFilter, frameSelect, retake, retakeAll, startOver }) {
  const [result, setResult] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setMessage('');
    composePhotobooth({ photos, frame, filter })
      .then(({ dataUrl }) => current && setResult(dataUrl))
      .catch((error) => current && setMessage(error.message))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [photos, frame, filter]);

  const download = async () => {
    try {
      const { blob } = await composePhotobooth({ photos, frame, filter });
      downloadBlob(blob, photoboothFilename());
    } catch (error) {
      setMessage(error.message || 'Download failed.');
    }
  };

  const print = async () => {
    if (!result) return;
    try {
      // Prefer printing via a clean iframe for better printer dialog reliability
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(`<!DOCTYPE html>
<html>
<head>
  <title>Photobooth Print</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
    body { display: flex; align-items: center; justify-content: center; background: #fff; }
    img { max-width: 100%; max-height: 100vh; object-fit: contain; display: block; }
    @media print {
      @page { margin: 0; size: auto; }
      html, body { width: 100%; height: 100%; background: #fff; }
      img {
        width: 5.5cm;
        height: auto;
        max-height: 18cm;
        margin: 0 auto;
        display: block;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <img id="strip" src="${result}" alt="Photobooth strip" />
  <script>
    const img = document.getElementById('strip');
    const doPrint = () => {
      setTimeout(() => {
        window.focus();
        window.print();
        setTimeout(() => {
          parent.document.body.removeChild(parent.document.querySelector('iframe[style*="width:0"]'));
        }, 800);
      }, 200);
    };
    if (img.complete) doPrint();
    else img.onload = doPrint;
  </script>
</body>
</html>`);
      doc.close();
    } catch (err) {
      // Fallback: open popup
      const popup = window.open('', '_blank', 'noopener,noreferrer');
      if (!popup) {
        setMessage('Browser blocked the print window. Please allow pop-ups, then try again.');
        return;
      }
      popup.document.write(`<!DOCTYPE html><html><head><title>Print</title>
<style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:#fff}
img{max-width:100%;max-height:100vh;object-fit:contain}
@media print{img{width:5.5cm;display:block;margin:auto}}</style>
</head><body><img src="${result}" onload="window.print();setTimeout(()=>window.close(),500)"/></body></html>`);
      popup.document.close();
    }
  };

  return (
    <main className="page review-page">
      <section className="review-heading">
        <p className="eyebrow">Your photo strip</p>
        <h1>Keep this one close.</h1>
        <p>{frame.name} · {FILTERS[filter].name}</p>
      </section>
      <div className="review-layout">
        <div className="final-strip">
          {loading && <div className="result-loading">Composing your strip...</div>}
          {result && <img src={result} alt="Final photobooth strip" />}
        </div>
        <aside className="edit-panel">
          {message && <p className="error-message" role="alert">{message}</p>}
          <div className="edit-group">
            <h2>Change frame</h2>
            <FrameGrid selectedId={frame.id} onSelect={frameSelect} compact />
          </div>
          <div className="edit-group">
            <h2>Choose a filter</h2>
            <div className="filter-list">
              {Object.entries(FILTERS).map(([id, item]) => (
                <button
                  type="button"
                  key={id}
                  className={filter === id ? 'selected' : ''}
                  onClick={() => setFilter(id)}
                  aria-pressed={filter === id}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <div className="edit-group">
            <h2>Retake a photo</h2>
            <PhotoRail photos={photos} current={PHOTO_COUNT} onRetake={retake} />
          </div>
          <div className="final-actions">
            <Button onClick={download} disabled={!result}>Download Photo</Button>
            <Button secondary onClick={print} disabled={!result}>Print</Button>
            <Button secondary onClick={retakeAll}>Retake All</Button>
            <Button secondary onClick={startOver}>Start Again</Button>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [selectedFrameId, setSelectedFrameId] = useState(FRAME_LIST[0].id);
  const [photos, setPhotos] = useState(() => Array(PHOTO_COUNT).fill(null));
  const [filter, setFilter] = useState('original');
  const frame = useMemo(() => getFrameById(selectedFrameId), [selectedFrameId]);

  const reset = () => {
    setPhotos(Array(PHOTO_COUNT).fill(null));
    setFilter('original');
  };

  const retake = (index) => {
    const next = [...photos];
    next[index] = null;
    setPhotos(next);
    setScreen(SCREENS.CAMERA);
  };

  return (
    <div className="app">
      <Header home={() => setScreen(SCREENS.HOME)} />
      {screen === SCREENS.HOME && <Home start={() => setScreen(SCREENS.FRAME)} />}
      {screen === SCREENS.FRAME && (
        <FrameSelector
          frame={frame}
          select={setSelectedFrameId}
          back={() => setScreen(SCREENS.HOME)}
          proceed={() => setScreen(SCREENS.CAMERA)}
        />
      )}
      {screen === SCREENS.CAMERA && (
        <Camera
          photos={photos}
          setPhotos={setPhotos}
          review={() => setScreen(SCREENS.REVIEW)}
          frames={() => setScreen(SCREENS.FRAME)}
          back={() => setScreen(SCREENS.FRAME)}
        />
      )}
      {screen === SCREENS.REVIEW && (
        <Review
          frame={frame}
          photos={photos}
          filter={filter}
          setFilter={setFilter}
          frameSelect={setSelectedFrameId}
          retake={retake}
          retakeAll={() => { reset(); setScreen(SCREENS.CAMERA); }}
          startOver={() => { reset(); setScreen(SCREENS.HOME); }}
        />
      )}
    </div>
  );
}
