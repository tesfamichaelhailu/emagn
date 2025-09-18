import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import {
  ShoppingBag,
  User,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  Settings,
  Shield,
  Package,
  CreditCard,
  MessageSquare,
} from "lucide-react";

export const Header = () => {
  const { user, isAuthenticated, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { t, i18n } = useTranslation("common");

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsUserMenuOpen(false);
  };

  const navigation = [
    { name: t("nav.home"), href: "/" },
    { name: t("nav.products"), href: "/products" },
  ];

  const userNavigation = [
    { name: t("nav.dashboard"), href: "/dashboard", icon: User },
    { name: t("nav.profile"), href: "/profile", icon: User },
    { name: t("nav.transactions"), href: "/transactions", icon: CreditCard },
    { name: t("nav.disputes"), href: "/disputes", icon: MessageSquare },
  ];

  const adminNavigation = [
    { name: t("nav.admin"), href: "/admin", icon: Shield },
    { name: t("nav.users"), href: "/admin/users", icon: User },
    { name: t("nav.products"), href: "/admin/products", icon: Package },
    {
      name: t("nav.transactions"),
      href: "/admin/transactions",
      icon: CreditCard,
    },
    { name: t("nav.disputes"), href: "/admin/disputes", icon: MessageSquare },
    { name: t("nav.settings"), href: "/admin/settings", icon: Settings },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                {t("app.name")}
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={t("nav.searchPlaceholder")}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          {/* Language Selector */}
          <div className="relative">
            <select
              aria-label={t("language.label")}
              className="border border-gray-300 rounded-md text-sm px-2 py-1 bg-white text-gray-700"
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              <option value="en">{t("language.en")}</option>
              <option value="am">{t("language.am")}</option>
              <option value="ti">{t("language.ti")}</option>
              <option value="om">{t("language.om")}</option>
              <option value="fr">{t("language.fr")}</option>
              <option value="ar">{t("language.ar")}</option>
            </select>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <button className="p-2 text-gray-400 hover:text-gray-500 relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-danger-400 ring-2 ring-white"></span>
                </button>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="hidden md:block text-gray-700 font-medium">
                      {user?.first_name}
                    </span>
                  </button>

                  {/* User Dropdown */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">
                          {user?.first_name} {user?.last_name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {user?.role}
                        </p>
                      </div>

                      {userNavigation.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <item.icon className="w-4 h-4 mr-3" />
                          {item.name}
                        </Link>
                      ))}

                      {hasRole(["admin", "super_admin"]) && (
                        <>
                          <div className="border-t border-gray-100 my-1"></div>
                          {adminNavigation.map((item) => (
                            <Link
                              key={item.name}
                              to={item.href}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <item.icon className="w-4 h-4 mr-3" />
                              {item.name}
                            </Link>
                          ))}
                        </>
                      )}

                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        {t("nav.signOut")}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium"
                >
                  {t("nav.signIn")}
                </Link>
                <Link to="/register" className="btn-primary">
                  {t("nav.getStarted")}
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-gray-700 hover:text-primary-600 block px-3 py-2 text-base font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              {/* Mobile Language Selector */}
              <div className="px-3 py-2">
                <label className="block text-xs text-gray-500 mb-1">
                  {t("language.label")}
                </label>
                <select
                  aria-label={t("language.label")}
                  className="w-full border border-gray-300 rounded-md text-sm px-2 py-2 bg-white text-gray-700"
                  value={i18n.language}
                  onChange={(e) => i18n.changeLanguage(e.target.value)}
                >
                  <option value="en">{t("language.en")}</option>
                  <option value="am">{t("language.am")}</option>
                  <option value="ti">{t("language.ti")}</option>
                  <option value="om">{t("language.om")}</option>
                  <option value="fr">{t("language.fr")}</option>
                  <option value="ar">{t("language.ar")}</option>
                </select>
              </div>

              {isAuthenticated ? (
                <>
                  <div className="border-t border-gray-200 my-2"></div>
                  {userNavigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="text-gray-700 hover:text-primary-600 block px-3 py-2 text-base font-medium"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}

                  {hasRole(["admin", "super_admin"]) && (
                    <>
                      <div className="border-t border-gray-200 my-2"></div>
                      {adminNavigation.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          className="text-gray-700 hover:text-primary-600 block px-3 py-2 text-base font-medium"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="border-t border-gray-200 my-2"></div>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-primary-600 block px-3 py-2 text-base font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t("nav.signIn")}
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary block text-center mx-3"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t("nav.getStarted")}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
