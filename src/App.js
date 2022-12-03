import Home from './component/Dashboard/Dashboard';
import Header from './component/Header/Header';
import Player from './component/Player/Player';
import DragWindow from './component/DragWindow/DragWindow';
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
