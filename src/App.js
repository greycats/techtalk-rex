//@flow

import React, { Component } from 'react'
import { Grid, Row, Col, Alert } from 'react-bootstrap'
import Nav from './Nav'
import Form from './Form'
import Spinner from 'react-spinkit'
import request from 'superagent'

class App extends Component {
  state: {
    loading: boolean,
    error?: string
  } = {
    loading: false
  }

  async performSearch(keyword: string) {
    this.setState({ loading: true })
    try {
      const res = await request.post('/api/search').send({ keyword })
      console.log(res.body)
    } catch(error) {
      this.setState({ error: error.message })
    }
    this.setState({ loading: false, error: undefined })
  }

  render() {
    return (
      <div>
        <Nav />
        <Grid>
          <Row>
            <Col md={10} mdOffset={1}>
              <Form onSubmit={this.performSearch.bind(this)} />
            </Col>
          </Row>
          <Row>
            <Col md={10} mdOffset={1}>
              {this.state.loading && <Spinner name='double-bounce' /> }
              {this.state.error && <Alert bsStyle="warning"><strong>Error</strong>: {this.state.error}</Alert> }
            </Col>
          </Row>
          </Grid>
      </div>
    )
  }
}

export default App
