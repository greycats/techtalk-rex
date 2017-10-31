import React, { Component } from 'react'
import { Navbar } from 'react-bootstrap'

class Nav extends Component {
  render() {
    return (
      <Navbar>
        <Navbar.Header>
          <Navbar.Brand>
            Snapshot Console
          </Navbar.Brand>
          <Navbar.Toggle />
        </Navbar.Header>
        <Navbar.Collapse>
        </Navbar.Collapse>
      </Navbar>
    )
  }
}

export default Nav
