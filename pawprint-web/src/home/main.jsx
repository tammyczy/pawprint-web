import {createRoot} from 'react-dom/client';
import Home from './Home.jsx';
import './home.css';
import markURL from '../../public/pawprint-mark-v3.png';

const icon=document.createElement('link');icon.rel='icon';icon.type='image/png';icon.href=markURL;document.head.append(icon);
// No StrictMode: its development-only double mount makes the Aurora component
// release its WebGL context and then try to reuse the same canvas.
createRoot(document.getElementById('root')).render(<Home />);
