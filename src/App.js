//@flow

import React, { Component } from 'react'
import { Grid, Row, Col, Alert, Image } from 'react-bootstrap'
import Nav from './Nav'
import Form from './Form'
import Spinner from 'react-spinkit'
import request from 'superagent'
import './App.css'

class App extends Component<any, any> {
  state: {
    loading: boolean,
    error?: string,
    image_id?: string
  } = {
    loading: false
  }

  async performSearch(keyword: string) {
    this.setState({ loading: true, image_id: undefined, error: undefined })
    try {
      const res = await request.post('/api/search').send({ keyword })
      const { id } = res.body
      this.setState({ image_id: id })
    } catch(error) {
      this.setState({ error: error.message })
    }
    this.setState({ loading: false })
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
              {this.state.loading && <Spinner name='double-bounce' id="spinner" /> }
              {this.state.error && <Alert bsStyle="warning"><strong>Error</strong>: {this.state.error}</Alert> }
              {this.state.image_id && <Image src={`/api/search/images/${this.state.image_id}`} thumbnail /> }
            </Col>
          </Row>
          </Grid>
      </div>
    )
  }
}

export default App
