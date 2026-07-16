import { useState } from "react";
import "./App.css";

export default function App() {
  const [url, setUrl] = useState("");

  return (
    <div className="container">
      <header className="header">
        <div className="logo">
          ⬇️
        </div>

        <div>
          <h1>MediaDown</h1>
          <p>Par Randrianera Fifaliana</p>
        </div>
      </header>

      <div className="card">
        <h2>Téléchargez vos vidéos rapidement</h2>

        <input
          type="text"
          placeholder="Collez votre lien YouTube, TikTok, Facebook..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <button>Télécharger</button>
      </div>

      <footer>
        © 2026 MediaDown • Développé par <strong>Randrianera Fifaliana</strong>
      </footer>
    </div>
  );
}
