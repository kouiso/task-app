/**
 * 馬匹登録画面
 * @packageDocumentation
 * /horseRegist
 * @file
 */

import styles from './style.module.scss'
import words from 'words/default'
import { TextField } from 'components/presenter/Inputs/TextField'
import { Button } from 'components/presenter/Buttons/Button'
import { DateField } from 'components/presenter/Inputs/DateField'
/**
 * HorseRegistPageの定義
 */
const HorseRegistPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <TextField
        placeholder={words.horseNamePlaceHolder}
        className={styles.horseName}
        id='horseName1'
        label={words.horseName}
      />
      <DateField
        placeholder={words.horseNamePlaceHolder}
        className={styles.horseName}
        id='horseName2'
        label={words.horseName}
      />
      <Button label={words.login} className={styles.loginBtn} />
    </div>
  )
}

export default HorseRegistPage
