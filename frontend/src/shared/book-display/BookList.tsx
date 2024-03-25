import React, { Component } from 'react'
import { Book } from '../types/Book';
import './BookList.css';
import { BOOK_OVERVIEW } from '../routes'
import { Link } from 'react-router-dom';
import {ArrowDropDown, ArrowDropUp} from "@material-ui/icons";

const CHAR_LIMIT = 40;

export interface BookListProps {
  bookListData: Book[];
  searchText: string;
}

interface SortingConfig {
  propertyName: string;
  ascendingOrder: boolean,
}

function recommendBooks(Books: Book[], readBooks: Book[], readingBooks: Book[]): Book[] {
  const genreCounts: { [genre: string]: number } = {};
  Books.forEach((book) => {
      book.bookGenre.forEach((genre) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
  });

  const sortedGenres = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a]);
  const mostReadGenre = sortedGenres[0];
  const secondMostReadGenre = sortedGenres[1];

  const authorCounts: { [author: string]: number } = {};
  Books.forEach((book) => {
      const authorName = book.author.fullName;
      authorCounts[authorName] = (authorCounts[authorName] || 0) + 1;
  });

  const sortedAuthors = Object.keys(authorCounts).sort((a, b) => authorCounts[b] - authorCounts[a]).slice(0, 5);

  const recommendedBooks = Books.filter((book) => {
      return (
          (book.bookGenre.includes(mostReadGenre) || book.bookGenre.includes(secondMostReadGenre)) &&
          sortedAuthors.includes(book.author.fullName) &&
          !readBooks.some((readBook) => readBook.id === book.id) &&
          !readingBooks.some((readingBook) => readingBook.id === book.id)
      );
  });

  const shuffledBooks = recommendedBooks.sort(() => Math.random() - 0.5);

  return shuffledBooks.slice(0, 2);
}

export default class BookList extends Component <BookListProps, BookListProps> {
  constructor(props: BookListProps) {
    super(props);
    this.state = {
      bookListData: [...props.bookListData],
      searchText: props.searchText || ''
    };
  }

  componentDidMount(): void {
    if(this.state.searchText !== '') {
      this.setState({
        bookListData: this.filterBooks()
      });
    }
  }

  sortingConfigs: SortingConfig[] = [];
  nameToOrder = new Map<string, boolean>();

  filterBooks(): Book[] {
    return this.state.bookListData.filter(book => {
      return book.title.toLowerCase().includes(this.state.searchText.toLowerCase());
    });
  }

  sortBooks(books: Book[]): Book[] {
    const sortedBooks = [...books];
    this.sortingConfigs.forEach(config => {
      const sortingMechanism = getSortingMechanism(config);
      sortedBooks.sort(sortingMechanism)
    })
    return sortedBooks;
  }

  sortBy = (propertyName: string): void => {
    const pendingChange = [...this.sortingConfigs];
    const sortingIndex = this.sortingConfigs
        .findIndex(configuration => configuration.propertyName === propertyName);
    if (sortingIndex !== -1) {
      const configuration: SortingConfig = this.sortingConfigs[sortingIndex];
      if (configuration.ascendingOrder) {
        pendingChange[sortingIndex] = {propertyName, ascendingOrder: false};
      } else {
        pendingChange.splice(sortingIndex, 1);
      }
    } else {
      pendingChange.push({propertyName, ascendingOrder: true});
    }
    this.sortingConfigs = pendingChange;
    this.nameToOrder =  getNameToOrder(pendingChange);
    this.setState(this.state);
  }

  render():JSX.Element {
    return (
        <div className="booklist-container">
          <div className="booklist-container-headers booklist-book">
            <div className="booklist-book-thumbnail"></div>
            <div className="booklist-book-title" onClick={()=> this.sortBy('title')}>
              Title{getSortingIcon('title', this.nameToOrder)}
            </div>
            <div className="booklist-book-author" onClick={()=> this.sortBy('author')}>
              Author{getSortingIcon('author', this.nameToOrder)}
            </div>
            <div className="booklist-book-shelf" onClick={()=> this.sortBy('shelf')}>
              Shelf{getSortingIcon('shelf', this.nameToOrder)}
            </div>
            <div className="booklist-book-genre" onClick={()=> this.sortBy('genre')}>
              Genre{getSortingIcon('genre', this.nameToOrder)}
            </div>
            <div className="booklist-book-rating" onClick={()=> this.sortBy('rating')}>
              Rating{getSortingIcon('rating', this.nameToOrder)}
            </div>
          </div>
          {this.sortBooks(this.state.bookListData).map(book => (
              <Link to={ BOOK_OVERVIEW + "/" + book.id }
                    style={{ textDecoration: 'none', color: 'black' }} key={book.id}>
                <div className="booklist-book">

                  <div className="booklist-book-thumbnail">
                    {book.title.length > CHAR_LIMIT ?
                        book.title.substring(0, CHAR_LIMIT) + "..." : book.title}
                  </div>
                  <div className="booklist-book-title">{book.title}</div>
                  <div className="booklist-book-author">{book.author.fullName}</div>
                  <div className="booklist-book-shelf">{book.predefinedShelf.shelfName}</div>
                  <div className="booklist-book-genre">{book.bookGenre}</div>
                  <div className="booklist-book-rating">{book.rating}</div>
                </div>
              </Link>
          ))}
        </div>
    )
  }
}

function getSortingMechanism(config: SortingConfig): (book1: Book, book2: Book) => number {
  const orderIndex = config.ascendingOrder ? 1 : -1;
  switch (config.propertyName) {
    default:
    case 'title':
      return ((book1: Book, book2: Book) =>
          orderIndex * book1.title.localeCompare(book2.title));
    case 'author':
      return ((book1: Book, book2: Book) =>
          orderIndex * book1.author.fullName.localeCompare(book2.author.fullName));
    case 'shelf':
      return ((book1: Book, book2: Book) =>
          orderIndex * book1.predefinedShelf.shelfName
              .localeCompare(book2.predefinedShelf.shelfName));
    case 'genre':
      return ((book1: Book, book2: Book) =>
          orderIndex * book1.bookGenre.toString().localeCompare(book2.bookGenre.toString()));
    case 'rating':
      return ((book1: Book, book2: Book) => {
        if (!isRated(book1) && !isRated(book2)) {
          return 0;
        }
        if (!isRated(book1)) {
          return 1;
        }
        if (!isRated(book2)) {
          return -1;
        }
        return  orderIndex * (getRating(book1) - getRating(book2));
      })
  }
}

function getRating(book: Book): number {
  return Number(book.rating.toString().split('/')[0]);
}


function isRated(book: Book): boolean {
  return book.rating.toString().includes('/');
}

function getNameToOrder(configurations: SortingConfig[]): Map<string, boolean> {
  const nameToOrder = new Map<string, boolean>();
  configurations.forEach(configuration =>
      nameToOrder.set(configuration.propertyName, configuration.ascendingOrder));
  return nameToOrder;
}

function getSortingIcon(propertyName: string, nameToOrder: Map<string, boolean>): JSX.Element {
  const ascendingOrder = nameToOrder.get(propertyName);
  if (ascendingOrder === undefined) {
    return <div />;
  }
  if (ascendingOrder) {
    return <ArrowDropUp fontSize="inherit" className="booklist-sorting-arrow-icons" />;
  }
  return <ArrowDropDown fontSize="inherit" className="booklist-sorting-arrow-icons" />;
}
