/**
 * 飲水量記録画面
 * @packageDocumentation
 * /waterRecord
 * @file
 */

import styles from './style.module.scss'
import words from 'words/default'
import { TextField } from 'components/presenter/Inputs/TextField'
import { Button } from 'components/presenter/Buttons/Button'
import { SelectField } from 'components/presenter/Inputs/SelectField'
import { TextLabel } from 'components/presenter/Labels/TextLabel'
import { IconButton } from 'components/presenter/Buttons/IconButton'
import { DatetimeField } from 'components/presenter/Inputs/DatetimeField'
/**
 * WaterRecordPageの定義
 */
const WaterRecordPage: React.FC = () => {
  const options: { value: string; label: string }[] = [
    { value: '0', label: 'a' },
  ]
  return (
    <div className={styles.container}>
      <div className={styles.contents}>
        <div className={styles.header}>
          <IconButton src='images/waterRecord.svg' size={100} />
          <div className={styles.title}>
            <TextLabel
              className={styles.waterRecord}
              label={words.waterRecord}
            />
            <TextLabel
              className={styles.waterRecordCaption}
              label={words.waterRecordCaption}
            />
          </div>
        </div>
        <SelectField
          placeholder={words.horsePlaceHolder}
          className={styles.horse}
          id='horse'
          label={words.horseWater}
          options={options}
        />
        <TextField
          placeholder={words.waterPlaceHolder}
          className={styles.water}
          id='water'
          label={words.water}
        />
        <DatetimeField className={styles.time} id='time' label={words.time} />
        <SelectField
          placeholder={words.recorderPlaceHolder}
          className={styles.recorder}
          id='recorder'
          label={words.recorder}
          options={options}
        />
        <div className={styles.footerBtn}>
          <Button label={words.cancel} className={styles.cancelBtn} />
          <Button label={words.record} />
        </div>
      </div>
    </div>
  )
}

export default WaterRecordPage
