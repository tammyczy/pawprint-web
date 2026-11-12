import {createRoot} from 'react-dom/client';
import Evidence from './Evidence.jsx';
import '../home/home.css';
import './evidence.css';
import markURL from '../../public/pawprint-mark-v3.png';

const icon=document.createElement('link');icon.rel='icon';icon.type='image/png';icon.href=markURL;document.head.append(icon);
createRoot(document.getElementById('root')).render(<Evidence />);
