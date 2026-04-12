import React, { useState, useMemo } from 'react';
import { BookOpen, Search, ChevronRight, ArrowLeft, FileText } from 'lucide-react';
import { KB_CATEGORIES, type KBCategory, type KBArticle } from './kbData';

type KBView = 'home' | 'category' | 'article';

export const Documentation: React.FC = () => {
  const [view, setView] = useState<KBView>('home');
  const [activeCategory, setActiveCategory] = useState<KBCategory | null>(null);
  const [activeArticle, setActiveArticle] = useState<KBArticle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    const results: Array<{ category: KBCategory; article: KBArticle }> = [];
    for (const cat of KB_CATEGORIES) {
      for (const article of cat.articles) {
        if (
          article.title.toLowerCase().includes(q) ||
          article.content.toLowerCase().includes(q) ||
          cat.title.toLowerCase().includes(q)
        ) {
          results.push({ category: cat, article });
        }
      }
    }
    return results;
  }, [searchTerm]);

  const openCategory = (cat: KBCategory) => {
    setActiveCategory(cat);
    setActiveArticle(null);
    setView('category');
    setSearchTerm('');
  };

  const openArticle = (cat: KBCategory, article: KBArticle) => {
    setActiveCategory(cat);
    setActiveArticle(article);
    setView('article');
    setSearchTerm('');
  };

  const goHome = () => {
    setView('home');
    setActiveCategory(null);
    setActiveArticle(null);
  };

  const goCategory = () => {
    setView('category');
    setActiveArticle(null);
  };

  const totalArticles = KB_CATEGORIES.reduce((sum, c) => sum + c.articles.length, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BookOpen className="h-8 w-8 text-blue-600 flex-shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-sm text-gray-500">
            {KB_CATEGORIES.length} categories · {totalArticles} articles
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
        <input
          type="text"
          placeholder="Search all articles…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
        />
      </div>

      {/* Search results */}
      {searchTerm && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {searchResults.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <BookOpen className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No articles match "{searchTerm}"</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </p>
              </div>
              {searchResults.map(({ category, article }) => (
                <button
                  key={`${category.id}-${article.id}`}
                  onClick={() => openArticle(category, article)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 flex items-center gap-3"
                >
                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{article.title}</p>
                    <p className="text-xs text-gray-400">{category.title}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 ml-auto flex-shrink-0" />
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Main KB content */}
      {!searchTerm && (
        <>
          {/* Breadcrumb */}
          {view !== 'home' && (
            <nav className="flex items-center gap-1 text-sm text-gray-400 flex-wrap">
              <button onClick={goHome} className="hover:text-blue-600 transition-colors">
                Knowledge Base
              </button>
              {activeCategory && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                  <button
                    onClick={goCategory}
                    className={`hover:text-blue-600 transition-colors ${view === 'category' ? 'text-gray-900 font-medium' : ''}`}
                  >
                    {activeCategory.title}
                  </button>
                </>
              )}
              {activeArticle && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-gray-900 font-medium">{activeArticle.title}</span>
                </>
              )}
            </nav>
          )}

          {/* Home — category cards */}
          {view === 'home' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {KB_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => openCategory(cat)}
                    className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-lg flex-shrink-0 ${cat.iconBg}`}>
                        <Icon className={`h-5 w-5 ${cat.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {cat.title}
                          </h3>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {cat.articles.length} {cat.articles.length === 1 ? 'article' : 'articles'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 leading-snug">{cat.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Category — article list */}
          {view === 'category' && activeCategory && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50">
                <button
                  onClick={goHome}
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                  aria-label="Back to Knowledge Base"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className={`p-1.5 rounded-md ${activeCategory.iconBg}`}>
                  <activeCategory.icon className={`h-4 w-4 ${activeCategory.iconColor}`} />
                </div>
                <span className="font-semibold text-gray-900">{activeCategory.title}</span>
                <span className="ml-auto text-xs text-gray-400">
                  {activeCategory.articles.length} {activeCategory.articles.length === 1 ? 'article' : 'articles'}
                </span>
              </div>
              {activeCategory.articles.map((article) => (
                <button
                  key={article.id}
                  onClick={() => openArticle(activeCategory, article)}
                  className="w-full text-left px-5 py-4 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 flex items-center gap-3 group"
                >
                  <FileText className="h-4 w-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                  <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 flex-1 transition-colors">
                    {article.title}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* Article — full content */}
          {view === 'article' && activeArticle && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50">
                <button
                  onClick={goCategory}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {activeCategory?.title}
                </button>
              </div>
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-5">{activeArticle.title}</h2>
                <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {activeArticle.content}
                </div>
              </div>
            </div>
          )}

          {/* Support footer — home only */}
          {view === 'home' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h3 className="font-semibold text-blue-900 mb-2">Still need help?</h3>
              <p className="text-sm text-blue-800">
                Contact your system administrator for account issues, or reach out to{' '}
                <a href="mailto:support@haccare.app" className="underline hover:text-blue-600">
                  support@haccare.app
                </a>{' '}
                for technical support.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Documentation;
