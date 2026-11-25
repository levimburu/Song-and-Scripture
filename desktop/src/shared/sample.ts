import { lookupPassage } from './bible'
import { itemFromScripture, itemFromSong, itemFromText } from './schedule'
import type { ScheduleItem } from './types'

// Starter songs. All three are public-domain hymns, so they are safe to ship.
export interface LibrarySong {
  title: string
  lyrics: string
}

export const SAMPLE_SONGS: LibrarySong[] = [
  {
    title: 'Amazing grace',
    lyrics: `Amazing grace! How sweet the sound
That saved a wretch like me!
I once was lost, but now am found,
Was blind, but now I see.

’Twas grace that taught my heart to fear,
And grace my fears relieved;
How precious did that grace appear,
The hour I first believed.

Through many dangers, toils and snares,
I have already come;
’Tis grace hath brought me safe thus far,
And grace will lead me home.

The Lord has promised good to me,
His word my hope secures;
He will my shield and portion be,
As long as life endures.`
  },
  {
    title: 'Blessed assurance',
    lyrics: `Blessed assurance, Jesus is mine!
O what a foretaste of glory divine!
Heir of salvation, purchase of God,
Born of His Spirit, washed in His blood.

[Chorus]
This is my story, this is my song,
Praising my Savior all the day long;
This is my story, this is my song,
Praising my Savior all the day long.

Perfect submission, perfect delight,
Visions of rapture now burst on my sight;
Angels descending bring from above
Echoes of mercy, whispers of love.

[Chorus]
This is my story, this is my song,
Praising my Savior all the day long;
This is my story, this is my song,
Praising my Savior all the day long.`
  },
  {
    title: 'Holy, holy, holy',
    lyrics: `Holy, holy, holy! Lord God Almighty!
Early in the morning our song shall rise to Thee;
Holy, holy, holy! Merciful and Mighty!
God in three Persons, blessed Trinity!`
  }
]

export function makeSampleSchedule(): ScheduleItem[] {
  const items: ScheduleItem[] = [
    itemFromText('info', 'Service info', ['Sunday service', 'Welcome']),
    itemFromSong(SAMPLE_SONGS[0].title, SAMPLE_SONGS[0].lyrics)
  ]
  const romans = lookupPassage({ book: 'Romans', chapter: 8, verseStart: 35, verseEnd: 39 })
  if (romans) items.push(itemFromScripture(romans))
  items.push(itemFromText('offering', 'Offering and M-Pesa', ['Offering']))
  items.push(itemFromText('video', 'Testimony video', ['Testimony video'], 'missing'))
  return items
}
