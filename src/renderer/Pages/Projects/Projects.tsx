//@ts-nocheck
import React from 'react';
import './Projects.css';

import './DropDownMenu.css';
import { useEffect, useState, useMemo, useCallback } from 'react';
import AEP1 from '/assets/aepversions/aep-icon-default.svg';
import AEP2 from '/assets/aepversions/aep-icon-green.svg';
import AEP3 from '/assets/aepversions/aep-icon-red.svg';
import AEP4 from '/assets/aepversions/aep-icon-gold.svg';
import { Link } from 'react-router-dom';
import searchIcon from '/assets/search.svg';
import { randomEmoji } from './functions/randomEmoji';
import { sortArray } from './functions/sortProjects';
import ContextMenu from '../../Components/ContextMenu/ContextMenu';
import SortBox from '../../Components/SortBox/SortBox';
import DeleteProject from '../../Components/DeleteProject/DeleteProject';
import RenameProject from '../../Components/RenameProject/RenameProject';

const Projects = (props: Props) => {
  const [fix, setFix] = useState(false);
  const [projects, setProjects] = useState<string[]>([]);
  const [isSearch, setSearch] = useState(false);
  const [dictionary, setDictionary] = useState([]);
  const [searchItem, setSearchItem] = useState('');
  const [filteredProjects, setFilteredProjects] = useState(projects);
  const [sort, setSort] = useState(0);
  const [sortValue, setSortValue] = useState(0);
  const [visibility, setVisibility] = useState(false);
  const [jsonArray, setArray] = useState([]);
  const [context, setContext] = React.useState(false);
  const [xyPosition, setxyPosition] = React.useState({ x: 0, y: 0 });
  const [selectedProject, setSelected] = useState('');
  const [priorities, setPriorities] = useState({});
  const [refreshProject, setRefresh] = useState(true);
  const [modalVisibility, setModalVisibility] = useState(false);
  const [renameModalVisibility, setRenameVisibility] = useState(false);
  const [deleteRefresh, setDeleteRefresh] = useState(true);
  const [pinnedProjects, setPinned] = useState([]);
  const [showPin, setPinVisibility] = useState(false);
  const [nameChanged, setNameChanged] = useState(false);

  function pinProject(name) {
    window.electron.ipcRenderer.sendMessage('add-pinned', [name]);
    window.electron.ipcRenderer.once('add-pinned', (response) => {
      setRefresh(!refreshProject);
    });
  }

  function changePriority(name: String, priority: number) {
    window.electron.ipcRenderer.sendMessage('set-priority', [name, priority]);
  }

  function setFixed() {
    if (window.scrollY >= 1) {
      setContext(false);
    }
    if (window.scrollY >= 400) {
      setFix(true);
    } else {
      setFix(false);
    }
  }

  window.addEventListener('scroll', setFixed);

  function windowClick() {
    setContext(false);
  }

  window.addEventListener('click', windowClick);

  const handleInputChange = (e: { target: { value: any } }) => {
    const searchTerm = e.target.value;
    if (searchTerm == '') {
      setSearch(false);
    } else {
      setSearch(true);
    }

    setSearchItem(searchTerm);

    const filteredItems = projects.filter((project) =>
      project.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    setFilteredProjects(filteredItems);
  };

  function getPriorities() {
    window.electron.ipcRenderer.sendMessage('get-priorities');
    window.electron.ipcRenderer.once('get-priorities', (response) => {
      setPriorities(response);
    });
  }
  // Gets projects.json
  function getProjects() {
    window.electron.ipcRenderer.sendMessage('get-projects', ['changes']);
    window.electron.ipcRenderer.once('get-projects', (response) => {
      setArray(Object.values(response));
    });
  }

  // Organize projects into dates
  function set() {
    sortArray(jsonArray, sortValue);

    const names = jsonArray.map((obj) => obj.name);

    const organizedProjects = {};
    jsonArray.forEach((obj) => {
      let date = new Date(obj.date);

      var monthYearKey = `${randomEmoji(
        date.getMonth(),
      )}  ${date.toLocaleString('default', {
        month: 'long',
      })} - ${date.getFullYear()}`;
      if (!organizedProjects[monthYearKey]) {
        organizedProjects[monthYearKey] = [];
      }

      organizedProjects[monthYearKey].push(obj);
    });

    setDictionary(organizedProjects);

    setProjects(names);
    setFilteredProjects(names);
  }

  function handleOpen(project: string) {
    window.electron.ipcRenderer.sendMessage('open-aep', project);
    window.electron.ipcRenderer.sendMessage('add-recent-aep', project);
  }

  function showNav(event, project: string) {
    setSelected(project);
    event.preventDefault();
    setContext(false);

    let positionChange = {
      x: event.pageX - window.scrollX + 2,
      y: event.pageY - window.scrollY + -10,
    };

    setxyPosition(positionChange);
    setContext(true);
  }

  //event handler for hiding the context menu
  const hideContext = (event) => {
    setContext(false);
  };
  const aepSVG = (name) => {
    let namePriority;

    try {
      namePriority = priorities[name].priority;
    } catch (error) {
      namePriority = 0;
    }

    switch (namePriority) {
      case 0:
        return <img className="aep-img" src={AEP1} />;
      case 1:
        return <img className="aep-img" src={AEP2} />;
      case 2:
        return <img className="aep-img" src={AEP3} />;
      case 3:
        return <img className="aep-img" src={AEP4} />;
      default:
        return <img className="aep-img" src={AEP4} />;
        break;
    }
  };

  const defaultList = () => {
    return (
      <ul className="projects-list">
        {filteredProjects.map((project, index) => (
          <li
            id="project-list"
            onDoubleClick={() => handleOpen(project)}
            key={index}
            className="project-item"
            onContextMenu={(e) => showNav(e, project)}
          >
            <div className="aep-img">{aepSVG(project)}</div>
            {project + '.aep'}
          </li>
        ))}
      </ul>
    );
  };

  const sortedByDate = useMemo(() => {
    return (
      <div className="projects">
        {Object.keys(dictionary).map((date) => (
          <div key={date}>
            <h3 id="date-title">{date}</h3>

            <hr className="solid"></hr>
            <ul className="projects-list" id="list-select">
              {dictionary[date].map((project, index) => (
                <li
                  id="project-list"
                  onDoubleClick={() => handleOpen(project.name)}
                  key={index}
                  className="project-item"
                  onContextMenu={(e) => showNav(e, project.name)}
                >
                  {aepSVG(project.name)}
                  <span className="project-name">{project.name + '.aep'}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }, [dictionary]);

  function handleSortClick() {
    setVisibility(!visibility);

    if (visibility == false) {
      setTimeout(() => {
        window.addEventListener(
          'click',
          function () {
            setVisibility(false);
          },
          { once: true },
        );
      }, '1');
    }
  }

  function getPinned() {
    window.electron.ipcRenderer.sendMessage('get-pinned');
    window.electron.ipcRenderer.once('get-pinned', (response) => {
      const temp = Object.keys(response);

      setPinned(temp);
    });
  }

  useEffect(() => {
    if (pinnedProjects.length > 0) {
      setPinVisibility(true);
    } else {
      setPinVisibility(false);
    }
  }, [pinnedProjects]);

  function displayPinned() {
    return (
      <>
        <div className="projects">
          <ul className="projects-list">
            {pinnedProjects.map((name, index) => (
              <li
                id="project-list"
                onDoubleClick={() => handleOpen(name)}
                key={index}
                className="project-item"
                onContextMenu={(e) => showNav(e, name)}
              >
                {aepSVG(name)}
                {name + '.aep'}
              </li>
            ))}
          </ul>
        </div>
      </>
    );
  }
  function pinnedContent() {
    return (
      <>
        <h3 id="date-title">📌 Pinned</h3>
        <hr className="solid"></hr>

        <div className="pinned-projects-content">{displayPinned()}</div>
      </>
    );
  }

  useEffect(() => {
    getPinned();
    getPriorities();
    getProjects();
  }, [refreshProject]);

  useEffect(() => {
    if (jsonArray.length >= 0) {
      set();
    }
  }, [jsonArray, sortValue]);

  useEffect(() => {
    console.log(pinnedProjects.length);
    if (searchItem != '') {
      console.log('false');
      setPinVisibility(false);
    } else if (searchItem == '' && pinnedProjects.length > 0) {
      console.log('true');
      setPinVisibility(true);
    }
  }, [searchItem]);

  return (
    <div>
      <div className="container">
        {modalVisibility && (
          <DeleteProject
            setModalVisibility={setModalVisibility}
            selectedProject={selectedProject}
            refreshProject={refreshProject}
            setRefresh={setRefresh}
            setContext={setContext}
          />
        )}

        {renameModalVisibility && (
          <RenameProject
            selectedProject={selectedProject}
            refreshProject={refreshProject}
            setRefresh={setRefresh}
            setContext={setContext}
            setRenameVisibility={setRenameVisibility}
            setNameChanged={setNameChanged}
            nameChanged={nameChanged}
          />
        )}

        <ContextMenu
          showNav={showNav}
          hideContext={hideContext}
          context={context}
          xyPosition={xyPosition}
          selectedProject={selectedProject}
          changePriority={changePriority}
          refreshProject={refreshProject}
          setContext={setContext}
          setRefresh={setRefresh}
          setModalVisibility={setModalVisibility}
          setSelected={setSelected}
          pinProject={pinProject}
          setRenameVisibility={setRenameVisibility}
        />

        <span className="container-background">
          <div className="title-block">
            <div className="title-text">Projects</div>
            <Link to={'/CreateAEP'}>
              <button className="button-add">+</button>
            </Link>
          </div>

          <div id="search-line">
            <div id="search-container">
              <div
                id="search-box"
                className={fix ? 'search-box-fixed' : 'search-box'}
              >
                <input
                  className="search-input"
                  type="text"
                  placeholder="Search..."
                  value={searchItem}
                  onChange={handleInputChange}
                  autoFocus
                />
                <img id="search-icon" src={searchIcon} alt="Search Icon" />
              </div>
            </div>

            <SortBox
              handleSortClick={handleSortClick}
              visibility={visibility}
              setSortValue={setSortValue}
            />
          </div>

          <div className="pinned-content">
            {showPin ? pinnedContent() : null}
          </div>
          <div className="content">
            {isSearch ? defaultList() : sortedByDate}
          </div>
        </span>
      </div>
    </div>
  );
};

export default Projects;
