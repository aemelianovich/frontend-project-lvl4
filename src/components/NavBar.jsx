// @ts-check

import React from 'react';
import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserContext } from './UserContext.jsx';

const NavBar = () => {
  const { user, setUser } = useUserContext();
  const { t } = useTranslation();

  const handleClick = (e) => {
    e.preventDefault();
    setUser(null);
  };

  return (
    <nav className="shadow-sm navbar navbar-expand-lg navbar-light bg-white">
      <div className="container">
        <Link className="navbar-brand" to="/">{t('navBar.title')}</Link>
        { user ? (<Button variant="primary" onClick={handleClick}>{t('navBar.exit')}</Button>) : null}
      </div>
    </nav>
  );
};

export default NavBar;
