import Home from './Home';
import Header from './Header';
import Player from './Player';
import DragWindow from './DragWindow';
import styles from './app.module.scss'
function App() {
  return (
    <div className={styles.app}>
      <DragWindow>
        <Header />
      </DragWindow>
      <Home />
      <Player />
    </div>
  );
}

export default App;
