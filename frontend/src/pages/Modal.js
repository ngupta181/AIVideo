import React, { useState } from 'react';

// Shared Tailwind CSS class strings
const borderClass = 'border border-border';
const roundedClass = 'rounded-lg';
const buttonClass = 'px-4 py-2 rounded-lg';

const Modal = ({ onClose, script, media, onUpdate }) => {
  const [newScript, setNewScript] = useState(script);
  const [newMedia, setNewMedia] = useState(media);

  const handleApplyChanges = () => {
    onUpdate(newScript, newMedia);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-card text-card-foreground w-11/12 max-w-4xl ${roundedClass} shadow-lg`}>
        <Header onClose={onClose} />
        <Content
          newScript={newScript}
          setNewScript={setNewScript}
          newMedia={newMedia}
          setNewMedia={setNewMedia}
        />
        <Footer onClose={onClose} onApplyChanges={handleApplyChanges} />
      </div>
    </div>
  );
};

const Header = ({ onClose }) => (
  <div className={`flex justify-between items-center border-b border-border p-4 bg-primary text-primary-foreground ${roundedClass} rounded-t-lg`}>
    <h2 className="text-lg font-semibold">Edit media</h2>
    <button className="text-muted-foreground hover:text-foreground" onClick={onClose}>✕</button>
  </div>
);

const Content = ({ newScript, setNewScript, newMedia, setNewMedia }) => (
  <div className="p-4">
    <MediaGallery media={newMedia} setMedia={setNewMedia} />
    <ChapterInfo />
    <MyMedia media={newMedia} setMedia={setNewMedia} />
    <Actions
      newScript={newScript}
      setNewScript={setNewScript}
      newMedia={newMedia}
      setNewMedia={setNewMedia}
    />
  </div>
);

const MediaGallery = ({ media, setMedia }) => (
  <div className="flex space-x-2 overflow-x-auto pb-4">
    {media.map((item, i) => (
      <img key={i} src={item.path} alt={`Media ${i}`} className={`rounded-lg ${borderClass}`} />
    ))}
  </div>
);

const ChapterInfo = () => (
  <div className={`border-t ${borderClass} pt-4`}>
    <h3 className="text-md font-semibold">Chapter 1 &gt; Media 1</h3>
    <p className="mt-2 bg-muted p-2 rounded-lg">
      <span className="font-semibold">What I wish I knew about NVIDIA's stock split instead of guessing!</span> Here's the fast track to understanding how this change can impact your investments. Attention, investors! NVIDIA just pulled a game-changer with their 10-for-1 stock split. But what does that actually mean? In simple terms, if you held one share before the split, now you've got ten! This might sound like you just hit the jackpot, but hold your horses—each share is now worth one-tenth of its previous value. Now, why should you care? First, stock splits can make shares more affordable to small investors, potentially boosting the stock's liquidity. More buyers and sellers? That's right, the market just got hotter! But here's the kicker—while the actual value of your investment stays the same...
    </p>
  </div>
);

const MyMedia = ({ media, setMedia }) => (
  <div className={`border-t ${borderClass} pt-4`}>
    <h3 className="text-md font-semibold">My Media</h3>
    <p className="mt-2 text-muted-foreground">Select media to replace</p>
    <div className="flex space-x-2 overflow-x-auto pb-4">
      {[7, 8, 9].map(i => (
        <img key={i} src={`https://placehold.co/150x100`} alt={`Media ${i}`} className={`rounded-lg ${borderClass}`} />
      ))}
    </div>
  </div>
);

const Actions = ({ newScript, setNewScript, newMedia, setNewMedia }) => (
  <div className={`border-t ${borderClass} pt-4 space-y-4`}>
    <div className="flex justify-between items-center">
      <button className={`bg-secondary text-secondary-foreground ${buttonClass} hover:bg-secondary/80`}>Upload media</button>     
    </div>
    <textarea
      className="w-full h-40 p-4 bg-input text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
      value={newScript}
      onChange={(e) => setNewScript(e.target.value)}
      placeholder="Enter new script"
    ></textarea>
    <input
      type="text"
      className="w-full p-2 bg-input text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
      value={newMedia}
      onChange={(e) => setNewMedia(e.target.value)}
      placeholder="Enter new media URL"
    />
  </div>
);

const Footer = ({ onClose, onApplyChanges }) => (
  <div className={`flex justify-end border-t ${borderClass} p-4 bg-secondary text-secondary-foreground ${roundedClass} rounded-b-lg`}>
    <button className={`bg-destructive text-destructive-foreground ${buttonClass} hover:bg-destructive/80 mr-2`} onClick={onClose}>Discard</button>
    <button className={`bg-primary text-primary-foreground ${buttonClass} hover:bg-primary/80`} onClick={onApplyChanges}>Apply Changes</button>
  </div>
);

const App = () => {
  const [isModalOpen, setIsModalOpen] = useState(true);

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div>
      {isModalOpen && <Modal onClose={closeModal} />}
    </div>
  );
};

export default App;
