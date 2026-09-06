import React from 'react';
import { BibleBook, BibleVersion } from '../types';
import { BookChapterSelector } from './BookChapterSelector';

interface Tier2BookSelectProps {
  selectedVersion: BibleVersion;
  onSelectBook: (book: BibleBook, chapter?: number) => void;
  onGoHome: () => void;
  initialBook?: BibleBook;
  isBookSelectorBold?: boolean;
}

export const Tier2BookSelect: React.FC<Tier2BookSelectProps> = ({
  selectedVersion,
  onSelectBook,
  onGoHome,
  initialBook,
  isBookSelectorBold = false,
}) => {
  return (
    <div className="w-full min-h-[85vh] flex flex-col justify-start items-center py-2 sm:py-4 px-1 sm:px-4">
      <BookChapterSelector
        selectedVersion={selectedVersion}
        initialTab="BOOK"
        currentBook={initialBook}
        currentChapter={1}
        onSelectChapter={(book, chapter) => onSelectBook(book, chapter)}
        onBack={onGoHome}
        isModal={false}
        isBookSelectorBold={isBookSelectorBold}
      />
    </div>
  );
};
