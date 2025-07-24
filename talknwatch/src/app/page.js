
import HostRoom from './components/hostRoom'
import styles from './page.module.css'

/*
https://coolors.co/palette/031926-468189-77aca2-9dbebb-f4e9cd
*/
export default function Home() {
  return (
    <div className={styles.pageBody}>
      <HostRoom />
     </div>
  );
}
