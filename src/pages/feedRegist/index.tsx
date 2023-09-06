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
          <label className={styles.label}>{words.list1}</label>
          <div className={styles.list}>
            <CheckboxField label={words.p15} id={'p15'} />
            <CheckboxField label={words.cookedMix} id={'cookedMix'} />
            <CheckboxField label={words.fu} id={'fu'} />
            <CheckboxField label={words.wheat} id={'wheat'} />
            <CheckboxField label={words.appen} id={'appen'} />
          </div>
          <div className={styles.list}>
            <CheckboxField label={words.corn} id={'corn'} />
            <CheckboxField label={words.linseedOil} id={'linseedOil'} />
            <CheckboxField label={words.vinegar} id={'vinegar'} />
            <CheckboxField label={words.strako} id={'strako'} />
            <CheckboxField label={words.pianissimo} id={'pianissimo'} />
          </div>
          <div className={styles.list}>
            <CheckboxField label={words.lucerne} id={'lucerne'} />
            <CheckboxField label={words.timothy} id={'timothy'} />
            <CheckboxField label={words.italian} id={'italian'} />
            <CheckboxField label={words.oats} id={'oats'} />
            <CheckboxField label={words.hayCube} id={'hayCube'} />
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
