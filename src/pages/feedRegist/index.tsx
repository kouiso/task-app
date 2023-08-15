/**
 * 餌登録画面
 * @packageDocumentation
 * /feedRegist
 * @file
 */

import styles from './style.module.scss'
import words from 'words/default'
import { Button } from 'components/presenter/Buttons/Button'
import { CheckboxField } from 'components/presenter/Inputs/CheckboxField'
import { TextLabel } from 'components/presenter/Labels/TextLabel'
import { IconButton } from 'components/presenter/Buttons/IconButton'
/**
 * FeedRegistPageの定義
 */
const FeedRegistPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.contents}>
        <div className={styles.header}>
          <IconButton src='images/feedRegist.svg' size={100} />
          <div className={styles.title}>
            <TextLabel className={styles.feedRegist} label={words.feedRegist} />
            <TextLabel
              className={styles.feedRegistCaption}
              label={words.feedRegistCaption}
            />
          </div>
        </div>
        <div className={styles.containerList}>
          <label>{words.list1}</label>
          <div className={styles.listRow}>
            <CheckboxField label={words.horseHin} id={'hinba'} />
            <CheckboxField label={words.horseBo} id={'boba'} />
            <CheckboxField label={words.horseSen} id={'senba'} />
          </div>
        </div>
        <div className={styles.footerBtn}>
          <Button label={words.cancel} className={styles.cancelBtn} />
          <Button label={words.regist} />
        </div>
      </div>
    </div>
  )
}

export default FeedRegistPage
